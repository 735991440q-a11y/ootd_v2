/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Cloud, Sparkles, Shirt, Trash2, Plus, 
  ChevronRight, Thermometer, Wind, Loader2, LogIn, LogOut,
  MapPin, Check, X, Info, User as UserIcon, Settings, Key,
  RefreshCw, Copy, Download, Upload, Database
} from 'lucide-react';
import { identifyClothing, getOutfitsForWeather, getSingleItemOutfits } from './lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface ClothingItem {
  id: string;
  category: string;
  color: string;
  style: string;
  season: string;
  thickness: string;
  formality: string;
  tags: string[];
  imageUrl: string;
  userId: string;
  createdAt: number;
}

interface LocalUser {
  uid: string;
  displayName: string;
}

// --- Helper Components ---
function StatCard({ num, label, active, onClick }: { num: number, label: string, active?: boolean, onClick?: () => void, key?: React.Key }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-3xl border transition-all flex flex-col items-center justify-center gap-1 group overflow-hidden relative",
        active 
          ? "bg-natural-primary border-natural-primary text-white shadow-lg shadow-natural-primary/25" 
          : "bg-white border-natural-border/30 text-natural-dark shadow-sm hover:border-natural-primary/50"
      )}
    >
      {active && (
        <motion.div 
          layoutId="stat-active" 
          className="absolute inset-0 bg-natural-primary -z-10" 
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className={cn("text-2xl font-light tracking-tight", active ? "text-white" : "text-natural-primary")}>{num}</span>
      <span className={cn("text-[8px] font-extrabold uppercase tracking-widest", active ? "text-white/80" : "text-natural-muted group-hover:text-natural-primary")}>{label}</span>
    </button>
  );
}

function OutfitItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-dashed border-natural-bg last:border-0">
      <span className="text-xs font-bold text-natural-muted uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-natural-dark">{value}</span>
    </div>
  );
}

function MiniItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold text-natural-muted uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-natural-dark leading-tight">{value}</p>
    </div>
  );
}

function VisualOutfit({ wardrobe, ids, miniature = false }: { wardrobe: ClothingItem[], ids: (string | undefined)[], miniature?: boolean }) {
  const items = ids
    .map(id => wardrobe.find(item => item.id === id))
    .filter((item): item is ClothingItem => !!item);

  if (items.length === 0) return null;

  return (
    <div className={cn("grid gap-2", miniature ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
      {items.map((item) => (
        <div key={item.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-natural-sidebar border border-natural-border/20 group">
          <img 
            src={item.imageUrl} 
            alt={item.category} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[8px] font-bold text-white text-center leading-none uppercase truncate">{item.category}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="space-y-2">
      <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
        {icon}
      </div>
      <p className="text-[10px] font-bold text-natural-muted uppercase tracking-widest leading-none">{label}</p>
    </div>
  );
}

function ClothingCard({ 
  item, categories, isDeleting, onUpdateCategory, onDelete, onDeleteRequest, onCancelDelete 
}: { 
  item: ClothingItem, categories: string[], isDeleting: boolean,
  onUpdateCategory: (id: string, cat: string) => void,
  onDelete: () => void,
  onDeleteRequest: () => void,
  onCancelDelete: () => void,
  key?: React.Key
}) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      onDeleteRequest();
      setIsPressing(false);
    }, 800);
  };

  const endPress = () => {
    setIsPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <motion.div 
      layout
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      className={cn(
        "bg-white rounded-2xl p-3 shadow-sm border transition-all relative select-none cursor-pointer",
        isDeleting ? "border-rose-200 ring-2 ring-rose-100" : "border-natural-border/30",
        isPressing && "brightness-95"
      )}
      animate={isPressing ? { 
        rotate: [-0.5, 0.5, -0.5, 0.5, 0],
        scale: 0.98
      } : { rotate: 0, scale: 1 }}
      transition={isPressing ? { repeat: Infinity, duration: 0.15 } : { duration: 0.2 }}
    >
      <div className="aspect-[4/5] bg-natural-sidebar rounded-xl overflow-hidden mb-3 relative pointer-events-none">
        <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        
        <AnimatePresence>
          {isDeleting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rose-500/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center pointer-events-auto"
            >
              <Trash2 className="w-8 h-8 text-white mb-2" />
              <p className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-4">确认删除？</p>
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="w-full py-2 bg-white text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-transform"
                >
                  是的，删除
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
                  className="w-full py-2 bg-rose-400/30 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="px-1">
        <div className="flex items-center justify-between mb-1" onClick={e => e.stopPropagation()}>
          <select 
            value={item.category}
            onChange={(e) => onUpdateCategory(item.id, e.target.value)}
            className="text-[10px] font-bold text-natural-primary bg-natural-sidebar px-1 py-0.5 rounded-full border-none focus:ring-0 cursor-pointer appearance-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span className="text-[10px] font-medium text-natural-muted">{item.style}</span>
        </div>
        <p className="text-sm font-bold text-natural-dark truncate">{item.color}款</p>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'weather' | 'inspiration'>('wardrobe');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['上衣', '裤子', '外套', '鞋']);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Weather state
  const [minTemp, setMinTemp] = useState<string>('15');
  const [maxTemp, setMaxTemp] = useState<string>('22');
  const [weatherDesc, setWeatherDesc] = useState<string>('晴天');
  const [weatherRecs, setWeatherRecs] = useState<any>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  // Inspiration state
  const [inspItem, setInspItem] = useState<any>(null);
  const [inspRecs, setInspRecs] = useState<any>(null);
  const [isInspLoading, setIsInspLoading] = useState(false);

  // Auth simulation state
  const [nickname, setNickname] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dynamic Categories Sorting (Most items first)
  const sortedCategories = useMemo(() => {
    const counts = categories.map(cat => ({
      name: cat,
      count: wardrobe.filter(i => i.category === cat).length
    }));
    return counts.sort((a, b) => b.count - a.count);
  }, [categories, wardrobe]);

  const topCategories = useMemo(() => sortedCategories.slice(0, 4), [sortedCategories]);

  // Filtered Wardrobe
  const filteredWardrobe = useMemo(() => {
    if (!selectedCategory) return wardrobe;
    return wardrobe.filter(item => item.category === selectedCategory);
  }, [wardrobe, selectedCategory]);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('wardrobe_api_key');
    if (savedApiKey) setApiKey(savedApiKey);

    const savedUser = localStorage.getItem('wardrobe_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      loadLocalData(u.uid);
    }
    setLoading(false);
  }, []);

  const loadLocalData = (uid: string) => {
    const data = localStorage.getItem(`wardrobe_data_${uid}`);
    if (data) {
      setWardrobe(JSON.parse(data));
    }
    const savedRecs = localStorage.getItem(`outfits_data_${uid}`);
    if (savedRecs) {
      setWeatherRecs(JSON.parse(savedRecs));
    }
    const savedCats = localStorage.getItem(`wardrobe_categories_${uid}`);
    if (savedCats) {
      setCategories(JSON.parse(savedCats));
    } else {
      setCategories(['上衣', '裤子', '外套', '鞋']);
    }
  };

  const saveLocalWardrobe = (uid: string, items: ClothingItem[]) => {
    localStorage.setItem(`wardrobe_data_${uid}`, JSON.stringify(items));
    setWardrobe(items);
  };

  const saveLocalCategories = (uid: string, cats: string[]) => {
    localStorage.setItem(`wardrobe_categories_${uid}`, JSON.stringify(cats));
    setCategories(cats);
  };

  const addCategory = () => {
    if (!user || !newCatName.trim()) return;
    if (categories.includes(newCatName.trim())) {
      setNewCatName('');
      return;
    }
    const updated = [...categories, newCatName.trim()];
    saveLocalCategories(user.uid, updated);
    setNewCatName('');
  };

  const handleLogin = () => {
    if (!nickname.trim()) {
      setAuthError('请输入昵称以开启您的衣橱');
      return;
    }
    
    // Save API key if provided
    if (apiKey.trim()) {
      localStorage.setItem('wardrobe_api_key', apiKey);
    } else {
      const savedApiKey = localStorage.getItem('wardrobe_api_key');
      if (!savedApiKey) {
        setAuthError('请输入 API Key 以启用 AI 功能');
        return;
      }
    }

    // Login logic: Find existing or create new
    const uid = `user_${nickname.toLowerCase().replace(/\s+/g, '_')}`;
    const newUser = { uid, displayName: nickname };
    
    setUser(newUser);
    localStorage.setItem('wardrobe_user', JSON.stringify(newUser));
    loadLocalData(uid);
  };

  const handleLogout = () => {
    setUser(null);
    setWardrobe([]);
    setWeatherRecs(null);
    localStorage.removeItem('wardrobe_user');
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 640;
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const updateItemCategory = (id: string, newCategory: string) => {
    if (!user) return;
    const updated = wardrobe.map(item => item.id === id ? { ...item, category: newCategory } : item);
    saveLocalWardrobe(user.uid, updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'inspect' = 'add') => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    
    if (mode === 'add') setIsUploading(true);
    else setIsInspLoading(true);

    try {
      const currentItems = [...wardrobe];
      for (const file of files as File[]) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const compressed = await compressImage(base64);
        const aiData = await identifyClothing(compressed, apiKey, categories);

        if (mode === 'add') {
          const newItem: ClothingItem = {
            ...aiData,
            id: 'item_' + Math.random().toString(36).substr(2, 9),
            imageUrl: compressed,
            userId: user!.uid,
            createdAt: Date.now(),
          };
          currentItems.unshift(newItem);
        } else {
          const processedInspItem = { ...aiData, id: 'inspect_item', imageUrl: compressed };
          setInspItem(processedInspItem);
          const recs = await getSingleItemOutfits(aiData, wardrobe, apiKey);
          setInspRecs(recs);
          break;
        }
      }
      if (mode === 'add') {
        saveLocalWardrobe(user!.uid, currentItems);
      }
    } catch (err: any) {
      console.error("File processing error:", err);
      if (err.message?.includes('429')) {
        setAuthError("抱歉，API 配额已达上限（免费额度有限）。请稍候再试，或更换 API Key。");
      } else {
        setAuthError(`处理失败: ${err.message || "请检查网络"}`);
      }
    } finally {
      setIsUploading(false);
      setIsInspLoading(false);
    }
  };

  const deleteItem = (id: string) => {
    if (!user) return;
    const updated = wardrobe.filter(i => i.id !== id);
    saveLocalWardrobe(user.uid, updated);
  };

  const handleExport = () => {
    const data = {
      wardrobe,
      categories,
      version: '1.0'
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    navigator.clipboard.writeText(encoded).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleImport = (mode: 'merge' | 'overwrite') => {
    if (!user || !syncInput.trim()) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(syncInput.trim()))));
      const importedWardrobe = decoded.wardrobe as ClothingItem[];
      const importedCategories = decoded.categories as string[];

      if (mode === 'overwrite') {
        saveLocalWardrobe(user.uid, importedWardrobe);
        saveLocalCategories(user.uid, importedCategories);
      } else {
        // Smart Merge: Deduplicate by Image URL
        const existingUrls = new Set(wardrobe.map(i => i.imageUrl));
        const newItems = importedWardrobe.filter(item => !existingUrls.has(item.imageUrl));
        const addedCount = newItems.length;
        
        const mergedWardrobe = [...wardrobe, ...newItems.map(item => ({
          ...item,
          id: 'item_' + Math.random().toString(36).substr(2, 9), // Fresh IDs
          userId: user.uid,
          createdAt: Date.now()
        }))];
        
        const mergedCategories = Array.from(new Set([...categories, ...importedCategories]));
        
        saveLocalWardrobe(user.uid, mergedWardrobe);
        saveLocalCategories(user.uid, mergedCategories);
        
        setSyncInput('');
        setSyncStatus(`智能合并完成，新增了 ${addedCount} 件唯一单品`);
        setTimeout(() => {
          setIsSyncModalOpen(false);
          setSyncStatus(null);
        }, 2000);
        return;
      }
      
      setSyncInput('');
      setSyncStatus("数据已完全覆盖");
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setSyncStatus(null);
      }, 2000);
    } catch (err) {
      setSyncStatus("无效的编码串");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const generateWeatherRecs = async () => {
    if (!user) return;
    setIsRecLoading(true);
    try {
      const recs = await getOutfitsForWeather(weatherDesc, Number(minTemp), Number(maxTemp), wardrobe, apiKey);
      setWeatherRecs(recs);
      localStorage.setItem(`outfits_data_${user.uid}`, JSON.stringify(recs));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429')) {
        alert("抱歉，API 免费配额已达上限。Gemini 3.1 Pro 模型的免费次数非常有限，建议稍后再试或在“设置”中尝试更换 Key。");
      } else {
        alert("生成失败，请检查网络或稍后再试。");
      }
    } finally {
      setIsRecLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  if (!user) return (
    <LandingPage 
      nickname={nickname}
      setNickname={setNickname}
      apiKey={apiKey}
      setApiKey={setApiKey}
      onLogin={handleLogin}
      error={authError}
    />
  );

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text pb-24 font-sans relative">
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-natural-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-natural-primary/10 rounded-xl text-natural-primary">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-natural-dark">密钥设置</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="text-natural-muted hover:text-rose-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-natural-muted uppercase px-1">Gemini API Key</p>
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem('wardrobe_api_key', e.target.value);
                    }}
                    placeholder="输入您的 API 密钥"
                    className="w-full bg-natural-sidebar/30 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-natural-primary"
                  />
                  <p className="text-[10px] text-natural-muted leading-relaxed px-1">
                    密钥仅保存在本地浏览器中，用于驱动 AI 穿搭识别与推荐功能。
                  </p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full bg-natural-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-natural-primary/20 hover:opacity-90 transition-all"
                >
                  保存并关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* All Categories Modal */}
      <AnimatePresence>
        {isAllCategoriesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAllCategoriesOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-natural-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-natural-sidebar rounded-xl text-natural-primary">
                    <Shirt className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-natural-dark">所有分类</h3>
                </div>
                <button onClick={() => setIsAllCategoriesOpen(false)} className="text-natural-muted hover:text-rose-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => { setSelectedCategory(null); setIsAllCategoriesOpen(false); }}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex justify-between items-center transition-all",
                    !selectedCategory ? "bg-natural-primary border-natural-primary text-white shadow-md" : "bg-white border-natural-border/30 hover:border-natural-primary"
                  )}
                >
                  <span className="text-xs font-bold">全部衣橱</span>
                  <span className="text-xs opacity-60">{wardrobe.length}</span>
                </button>
                {sortedCategories.map(cat => (
                  <button 
                    key={cat.name}
                    onClick={() => { setSelectedCategory(cat.name); setIsAllCategoriesOpen(false); }}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex justify-between items-center transition-all",
                      selectedCategory === cat.name ? "bg-natural-primary border-natural-primary text-white shadow-md" : "bg-white border-natural-border/30 hover:border-natural-primary"
                    )}
                  >
                    <span className="text-xs font-bold truncate pr-1">{cat.name}</span>
                    <span className="text-xs opacity-60">{cat.count}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync & Merge Modal */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSyncModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-natural-border overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-natural-dark">数据同步与备份</h3>
                </div>
                <button onClick={() => setIsSyncModalOpen(false)} className="text-natural-muted hover:text-rose-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                {syncStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-natural-dark text-white text-[10px] font-bold py-2 px-4 rounded-full text-center tracking-tight"
                  >
                    {syncStatus}
                  </motion.div>
                )}
                {/* Export Section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-natural-muted uppercase px-1 tracking-widest">导出当前衣橱</p>
                  <button 
                    onClick={handleExport}
                    className="w-full bg-natural-sidebar/50 border border-natural-border/30 rounded-2xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Download className="w-4 h-4 text-natural-primary" />
                      </div>
                      <span className="text-sm font-bold text-natural-dark">复制导出编码</span>
                    </div>
                    {copySuccess ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-natural-muted group-hover:text-natural-primary" />
                    )}
                  </button>
                </div>

                <div className="h-px bg-natural-bg" />

                {/* Import Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-natural-muted uppercase px-1 tracking-widest">导入外部数据</p>
                  <textarea 
                    placeholder="粘贴数据编码到这里..."
                    value={syncInput}
                    onChange={(e) => setSyncInput(e.target.value)}
                    className="w-full bg-natural-sidebar/30 border-none rounded-2xl px-5 py-4 text-xs h-24 focus:ring-2 focus:ring-natural-primary transition-all resize-none"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleImport('merge')}
                      disabled={!syncInput.trim()}
                      className="bg-white border border-natural-border text-natural-dark font-bold py-3.5 rounded-2xl text-xs hover:bg-natural-sidebar transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> 智能合并
                    </button>
                    {showOverwriteConfirm ? (
                      <div className="flex gap-2 w-full animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => {
                            handleImport('overwrite');
                            setShowOverwriteConfirm(false);
                          }}
                          className="flex-1 bg-rose-600 text-white font-bold py-3.5 rounded-2xl text-[10px] hover:bg-rose-700 transition-all"
                        >
                          确认覆盖
                        </button>
                        <button 
                          onClick={() => setShowOverwriteConfirm(false)}
                          className="flex-1 bg-natural-bg text-natural-muted font-bold py-3.5 rounded-2xl text-[10px] hover:bg-natural-sidebar transition-all"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowOverwriteConfirm(true)}
                        disabled={!syncInput.trim()}
                        className="w-full bg-rose-50 border border-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl text-xs hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Loader2 className="w-3.5 h-3.5" /> 完全覆盖
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-natural-sidebar/90 backdrop-blur-md border-b border-natural-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-sm">
            <Shirt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-natural-dark text-lg tracking-tight">不准裸奔</h1>
            <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest leading-none">Hello, {user.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsSyncModalOpen(true)}
            className="p-2 text-natural-muted hover:text-natural-primary transition-colors flex items-center gap-1.5"
            title="数据同步"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-natural-muted hover:text-natural-primary transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="p-2 text-natural-muted hover:text-rose-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'wardrobe' && (
            <motion.div 
              key="wardrobe"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-natural-primary rounded-full transition-all" />
                  <h2 className="text-xl font-bold text-natural-dark">我的衣橱</h2>
                  <label className="w-7 h-7 bg-natural-primary/10 rounded-lg flex items-center justify-center text-natural-primary cursor-pointer hover:bg-natural-primary hover:text-white transition-all active:scale-90">
                    <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'add')} disabled={isUploading} />
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </label>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-natural-dark leading-none">{wardrobe.length}</span>
                  <span className="text-[8px] font-bold text-natural-muted uppercase tracking-tighter">Items</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">关键分类</p>
                  <button 
                    onClick={() => setIsAllCategoriesOpen(true)}
                    className="text-[10px] font-bold text-natural-primary flex items-center gap-1 hover:opacity-80 transition-all"
                  >
                    查看全部 ({categories.length}) <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {topCategories.map(cat => (
                    <StatCard 
                      key={cat.name} 
                      num={cat.count} 
                      label={cat.name} 
                      active={selectedCategory === cat.name}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    />
                  ))}
                  {selectedCategory && (
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className="col-span-2 py-2 text-[10px] font-bold text-natural-muted border border-dashed border-natural-border rounded-xl hover:bg-natural-sidebar transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-3 h-3" /> 清除筛选: {selectedCategory}
                    </button>
                  )}
                </div>

                {/* Concise Add Category Button/Input */}
                <div className="bg-white rounded-2xl p-2.5 border border-natural-border/60 shadow-sm">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-[9px] font-bold text-natural-muted uppercase tracking-tighter">管理分类</p>
                    <button 
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-[9px] font-bold text-natural-primary"
                    >
                      {isAddingCategory ? "取消" : "新增 +"}
                    </button>
                  </div>
                  
                  {isAddingCategory && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="flex gap-1.5 mb-2 overflow-hidden"
                    >
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="分类名" 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addCategory();
                            setIsAddingCategory(false);
                          }
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                        className="flex-1 bg-natural-sidebar/30 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-0"
                      />
                      <button 
                        onClick={() => { addCategory(); setIsAddingCategory(false); }}
                        className="bg-natural-primary text-white px-2.5 rounded-lg active:scale-95 transition-transform"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {categories.map(cat => (
                      <span 
                        key={cat} 
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded-md transition-all cursor-pointer",
                          selectedCategory === cat 
                            ? "bg-natural-primary text-white" 
                            : "text-natural-muted bg-natural-sidebar hover:bg-natural-border/20"
                        )}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wardrobe Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredWardrobe.length === 0 ? (
                  <div className="col-span-2 py-20 text-center space-y-3">
                    <div className="w-16 h-16 bg-natural-sidebar rounded-full flex items-center justify-center mx-auto text-natural-muted/30">
                      <Shirt className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-natural-muted">该分类下暂无单品</p>
                    <button onClick={() => setSelectedCategory(null)} className="text-xs text-natural-primary font-bold">查看全部衣橱</button>
                  </div>
                ) : (
                  filteredWardrobe.map((item) => (
                    <ClothingCard 
                      key={item.id} 
                      item={item} 
                      categories={categories}
                      isDeleting={deletingId === item.id}
                      onUpdateCategory={updateItemCategory}
                      onDelete={() => deleteItem(item.id)}
                      onDeleteRequest={() => setDeletingId(item.id)}
                      onCancelDelete={() => setDeletingId(null)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'weather' && (
            <motion.div 
              key="weather"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-natural-primary rounded-full" />
                <h2 className="text-xl font-bold text-natural-dark">天气搭配推荐</h2>
              </div>
              
              <div className="bg-natural-primary text-white rounded-3xl p-6 shadow-lg shadow-natural-primary/10 space-y-6 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                  <Cloud className="w-40 h-40" />
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5" /> 气温区间
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={minTemp} 
                          onChange={(e) => setMinTemp(e.target.value)}
                          className="w-full bg-white/10 border-none rounded-xl px-2 py-2 font-light text-2xl focus:ring-1 focus:ring-white/30 transition-all text-white text-center"
                        />
                      </div>
                      <span className="text-white/50">-</span>
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={maxTemp} 
                          onChange={(e) => setMaxTemp(e.target.value)}
                          className="w-full bg-white/10 border-none rounded-xl px-2 py-2 font-light text-2xl focus:ring-1 focus:ring-white/30 transition-all text-white text-center"
                        />
                      </div>
                      <span className="text-white/50 text-xl">°C</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5" /> 天气描述
                    </label>
                    <select 
                      value={weatherDesc} 
                      onChange={(e) => setWeatherDesc(e.target.value)}
                      className="w-full bg-white/10 border-none rounded-xl px-4 py-3 font-bold text-base focus:ring-1 focus:ring-white/30 appearance-none transition-all text-white"
                    >
                      <option className="text-natural-text">晴间多云</option>
                      <option className="text-natural-text">多云</option>
                      <option className="text-natural-text">阴天</option>
                      <option className="text-natural-text">小雨</option>
                      <option className="text-natural-text">大雨</option>
                      <option className="text-natural-text">有风</option>
                      <option className="text-natural-text">下雪</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={generateWeatherRecs}
                  disabled={isRecLoading || wardrobe.length === 0}
                  className="w-full bg-white text-natural-primary rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-natural-sidebar disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-black/5"
                >
                  {isRecLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  获取定制穿搭
                </button>
              </div>

              {weatherRecs && (
                <div className="space-y-4">
                  <div className="bg-natural-sidebar text-natural-text border border-natural-border/50 rounded-2xl p-4 flex gap-3 italic">
                    <Info className="w-5 h-5 text-natural-primary flex-shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">{weatherRecs.weatherAnalysis}</p>
                  </div>
                  {weatherRecs.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-natural-border/30">
                      <div className="flex items-center justify-between mb-4">
                        <span className="bg-[#F0F4EF] text-[#4A704A] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          方案 {idx + 1}：{rec.title}
                        </span>
                      </div>
                      <div className="space-y-3 mb-5">
                        <OutfitItem label="上装" value={rec.top} />
                        <OutfitItem label="下装" value={rec.bottom} />
                        <OutfitItem label="外套" value={rec.outerwear || '无'} />
                        <OutfitItem label="鞋履" value={rec.shoes} />
                      </div>

                      {/* Visual Display of Wardrobe Items */}
                      <VisualOutfit 
                        wardrobe={wardrobe} 
                        ids={[rec.topId, rec.bottomId, rec.outerwearId, rec.shoesId]} 
                      />
                      <div className="mt-4 p-4 bg-natural-sidebar/20 rounded-2xl border border-natural-border/10">
                        <p className="text-[10px] font-bold text-natural-muted uppercase mb-1 flex items-center gap-1">
                          <Camera className="w-3 h-3" /> 视觉意向描述
                        </p>
                        <p className="text-xs text-natural-text leading-relaxed">{rec.visualPrompt}</p>
                      </div>
                      <div className="mt-5 pt-4 border-t border-natural-bg">
                        <p className="text-xs text-natural-muted leading-relaxed font-medium bg-natural-sidebar/30 p-3 rounded-xl italic">“{rec.reason}”</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'inspiration' && (
            <motion.div 
              key="inspiration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-natural-primary rounded-full" />
                <h2 className="text-xl font-bold text-natural-dark">单品搭配分析</h2>
              </div>
              
              {!inspItem ? (
                <label className="bg-white border-2 border-dashed border-natural-border rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-natural-primary transition-all shadow-sm">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'inspect')} />
                  <div className="w-16 h-16 bg-natural-sidebar rounded-2xl flex items-center justify-center text-natural-primary">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-natural-dark">上传心仪单品</p>
                    <p className="text-sm text-natural-muted font-medium">我们将为您寻找最佳穿搭灵感</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-6 pb-4">
                  <div className="bg-white rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-natural-border/30 flex gap-5 items-center">
                    <div className="w-28 h-36 bg-natural-sidebar rounded-xl overflow-hidden flex-shrink-0">
                      <img src={inspItem.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-natural-dark">{inspItem.color} {inspItem.category}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {inspItem.tags?.map((t: string) => (
                          <span key={t} className="text-[10px] font-bold text-natural-primary bg-natural-sidebar px-2 py-0.5 rounded-md uppercase">{t}</span>
                        ))}
                      </div>
                      <p className="text-xs text-natural-muted font-bold">风格: {inspItem.style} | 场景: {inspRecs?.analysis?.scene || '日常'}</p>
                    </div>
                  </div>

                  {isInspLoading ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-natural-muted">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-sm font-bold tracking-tight">AI 造型顾问正在构思...</p>
                    </div>
                  ) : inspRecs && (
                    <div className="space-y-8">
                      {/* Internal Wardrobe */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-natural-dark uppercase tracking-widest">
                            衣橱私藏组合
                          </h4>
                          <span className="text-[10px] font-bold text-natural-muted uppercase">基于您的单品</span>
                        </div>
                        <div className="grid gap-4">
                          {inspRecs.internalOutfits.map((rec: any, i: number) => (
                            <div key={i} className="bg-white rounded-2xl p-5 border border-natural-border/20 shadow-sm border-l-4 border-l-natural-primary">
                              <p className="font-bold text-natural-dark mb-4 text-sm">{rec.title}</p>
                              <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-5">
                                <MiniItem label="下装" value={rec.bottom} />
                                <MiniItem label="外套" value={rec.outerwear} />
                              </div>
                              <VisualOutfit 
                                wardrobe={[...wardrobe, inspItem]} 
                                ids={['inspect_item', rec.topId, rec.bottomId, rec.outerwearId, rec.accessoriesId]} 
                                miniature
                              />
                              <p className="text-xs text-natural-muted bg-natural-sidebar/40 p-3 rounded-xl italic leading-relaxed">“{rec.reason}”</p>
                            </div>
                          ))}
                        </div>
                        {inspRecs.missingItems?.length > 0 && (
                          <div className="bg-[#F4F0EF] border border-[#704A4A]/10 rounded-xl p-4">
                            <p className="text-[10px] text-[#704A4A] font-bold uppercase tracking-widest mb-1">建议补充：</p>
                            <p className="text-xs text-[#704A4A]/80 font-bold leading-relaxed">{inspRecs.missingItems.join('、')}</p>
                          </div>
                        )}
                      </section>

                      {/* Internet Reference */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-natural-dark uppercase tracking-widest">
                            全球趋势参考
                          </h4>
                          <span className="text-[10px] font-bold text-[#4A704A] uppercase bg-[#F0F4EF] px-2 py-0.5 rounded-full">流行趋势</span>
                        </div>
                        <div className="grid gap-4">
                          {inspRecs.internetReferences.map((rec: any, i: number) => (
                            <div key={i} className="bg-natural-primary text-white p-5 rounded-2xl shadow-lg shadow-black/5">
                              <p className="font-bold text-white mb-2">{rec.title}</p>
                              <p className="text-sm text-white/80 mb-4 leading-relaxed font-medium">{rec.coreStrategy}</p>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {rec.suggestedItems.map((s: string) => (
                                  <span key={s} className="text-[10px] font-bold bg-white/10 text-white/90 px-2.5 py-1 rounded-lg border border-white/10">+ {s}</span>
                                ))}
                              </div>
                              <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{rec.scene}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                      
                      <button 
                        onClick={() => { setInspItem(null); setInspRecs(null); }}
                        className="w-full py-4 border border-natural-border text-natural-muted rounded-2xl font-bold bg-white hover:bg-natural-sidebar transition-all flex items-center justify-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        分析其他单品
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-natural-sidebar/80 backdrop-blur-xl border border-natural-border/50 shadow-2xl rounded-[32px] px-2 py-2 flex items-center gap-2 z-50">
        <NavButton 
          active={activeTab === 'wardrobe'} 
          onClick={() => setActiveTab('wardrobe')}
          icon={<Shirt className="w-5 h-5" />}
          label="我的衣橱"
        />
        <NavButton 
          active={activeTab === 'weather'} 
          onClick={() => setActiveTab('weather')}
          icon={<Cloud className="w-5 h-5" />}
          label="天气搭配"
        />
        <NavButton 
          active={activeTab === 'inspiration'} 
          onClick={() => setActiveTab('inspiration')}
          icon={<Sparkles className="w-5 h-5" />}
          label="灵感搭配"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-[24px] transition-all duration-300 group",
        active ? "bg-natural-primary text-white shadow-lg" : "text-natural-muted hover:text-natural-primary hover:bg-natural-bg"
      )}
    >
      <span className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</span>
      {active && (
        <motion.span 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          className="text-xs font-bold whitespace-nowrap overflow-hidden tracking-tighter"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}

function LandingPage({ 
  nickname, setNickname, apiKey, setApiKey, onLogin, error 
}: { 
  nickname: string, setNickname: (v: string) => void, 
  apiKey: string, setApiKey: (v: string) => void,
  onLogin: () => void, error: string | null
}) {
  const isKeySaved = localStorage.getItem('wardrobe_api_key');

  return (
    <div className="h-screen bg-natural-bg flex flex-col items-center justify-center p-8 overflow-hidden relative font-sans text-natural-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--color-natural-sidebar)_0%,_transparent_50%)] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 w-full max-w-sm"
      >
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-natural-primary rounded-[28px] rotate-6 transform" />
          <div className="absolute inset-0 bg-white border border-natural-border rounded-[28px] flex items-center justify-center -rotate-3 shadow-xl">
            <Shirt className="w-8 h-8 text-natural-primary" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-natural-dark text-center">
            衣橱助手 <span className="font-light text-natural-primary italic font-serif">Advisor</span>
          </h1>
          <p className="text-natural-muted font-medium leading-relaxed px-6 text-sm">
            您的智能穿搭管家，支持多用户切换与私人密钥保护。
          </p>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-natural-border shadow-xl shadow-natural-primary/5 space-y-6 text-left">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-natural-muted uppercase px-1 flex items-center gap-1.5">
                <UserIcon className="w-3 h-3 text-natural-primary" /> 我的昵称
              </p>
              <input 
                type="text" 
                placeholder="例如：时尚达人"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                className="w-full bg-natural-sidebar/20 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-natural-primary/30 transition-all placeholder:text-natural-muted/50"
              />
            </div>

            {!isKeySaved && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-natural-muted uppercase px-1 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-natural-primary" /> Gemini API Key
                </p>
                <input 
                  type="password" 
                  placeholder="请输入您的密钥"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                  className="w-full bg-natural-sidebar/20 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-natural-primary/30 transition-all placeholder:text-natural-muted/50"
                />
              </div>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-1.5 px-1">
              <div className="w-1 h-1 bg-rose-500 rounded-full" />
              <p className="text-[10px] text-rose-500 font-bold">{error}</p>
            </div>
          )}

          <button 
            onClick={onLogin}
            className="w-full bg-natural-primary text-white rounded-2xl py-4.5 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-natural-primary/25 text-sm"
          >
            开启衣橱之旅
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 pt-2">
          <FeatureItem icon={<Camera className="w-4 h-4" />} label="识别" />
          <div className="w-1 h-1 bg-natural-border rounded-full" />
          <FeatureItem icon={<Cloud className="w-4 h-4" />} label="天气" />
          <div className="w-1 h-1 bg-natural-border rounded-full" />
          <FeatureItem icon={<Sparkles className="w-4 h-4" />} label="灵感" />
        </div>
      </motion.div>
    </div>
  );
}
