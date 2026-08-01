import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Admin() {
  const [deposits, setDeposits] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [settings, setSettings] = useState({ card_number: '', card_holder: '', min_withdraw: 10 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('deposits');

  // Yeni missiya formu
  const [missionTitle, setMissionTitle] = useState('');
  const [missionUrl, setMissionUrl] = useState('');
  const [missionReward, setMissionReward] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    // Depozit sorğuları
    const { data: depData } = await supabase
      .from('investments')
      .select('*, profiles(email, full_name), vip_packages(name)')
      .eq('status', 'pending');
    setDeposits(depData || []);

    // Çıxarış sorğuları
    const { data: withData } = await supabase
      .from('withdraw_requests')
      .select('*, profiles(email, full_name)')
      .eq('status', 'pending');
    setWithdraws(withData || []);

    // Sistem parametrləri
    const { data: setData } = await supabase.from('system_settings').select('*').single();
    if (setData) setSettings(setData);
  };

  // Depoziti təsdiqləmək (SQL funksiyamızı çağırır)
  const handleApproveDeposit = async (id) => {
    setLoading(true);
    const { error } = await supabase.rpc('approve_deposit', { p_investment_id: id });
    setLoading(false);

    if (error) {
      alert('Xəta baş verdi: ' + error.message);
    } else {
      alert('Depozit təsdiqləndi və VIP aktivləşdirildi!');
      loadAdminData();
    }
  };

  // Depoziti ləğv etmək
  const handleRejectDeposit = async (id) => {
    setLoading(true);
    await supabase.from('investments').update({ status: 'rejected' }).eq('id', id);
    setLoading(false);
    alert('Depozit rədd edildi.');
    loadAdminData();
  };

  // Çıxarışı təsdiqləmək
  const handleApproveWithdraw = async (req) => {
    setLoading(true);
    // Dondurulmuş balansı silirik
    const { error: profileErr } = await supabase.rpc('exec_sql', {
      query: `UPDATE profiles SET frozen_balance = frozen_balance - ${req.amount} WHERE id = '${req.user_id}';`
    }).catch(async () => {
      // Birbaşa update dəstəyi
      await supabase.from('profiles').update({ 
        frozen_balance: supabase.raw(`frozen_balance - ${req.amount}`) 
      }).eq('id', req.user_id);
    });

    await supabase.from('withdraw_requests').update({ status: 'approved' }).eq('id', req.id);
    
    // Bildiriş göndəririk
    await supabase.from('notifications').insert({
      user_id: req.user_id,
      title: 'Pul Çıxarışı Təsdiqləndi',
      message: `${req.amount} AZN məbləğində çıxarış sorğunuz icra olundu.`
    });

    setLoading(false);
    alert('Çıxarış təsdiqləndi!');
    loadAdminData();
  };

  // Yeni missiya yaratmaq
  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!missionTitle || !missionUrl || !missionReward) return alert('Bütün sahələri doldurun!');

    setLoading(true);
    const { error } = await supabase.from('missions').insert({
      title: missionTitle,
      video_url: missionUrl,
      reward: parseFloat(missionReward),
      duration_seconds: 30
    });

    setLoading(false);
    if (error) {
      alert('Xəta: ' + error.message);
    } else {
      alert('Yeni missiya əlavə olundu!');
      setMissionTitle('');
      setMissionUrl('');
      setMissionReward('');
    }
  };

  // Sistem parametrlərini yeniləmək
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        card_number: settings.card_number,
        card_holder: settings.card_holder,
        min_withdraw: parseFloat(settings.min_withdraw)
      })
      .eq('id', 1);

    setLoading(false);
    if (error) alert('Xəta: ' + error.message);
    else alert('Parametrlər uğurla yeniləndi!');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 border-b border-slate-700 pb-3 text-amber-400">
          🛠️ Platforma Admin Paneli
        </h1>

        {/* Tab Menyu */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              activeTab === 'deposits' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            💳 Depozit Sorğuları ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdraws')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              activeTab === 'withdraws' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            💸 Çıxarış Sorğuları ({withdraws.length})
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              activeTab === 'missions' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            🎯 Missiya Əlavə Et
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              activeTab === 'settings' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            ⚙️ Sistem Tənzimləmələri
          </button>
        </div>

        {/* 1. Depozit Sorğuları */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            {deposits.length === 0 ? (
              <p className="text-gray-400">Gözləyən depozit sorğusu yoxdur.</p>
            ) : (
              deposits.map((item) => (
                <div key={item.id} className="bg-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-700">
                  <div>
                    <p className="text-sm font-semibold text-amber-400">{item.profiles?.email}</p>
                    <p className="text-lg font-bold">{item.vip_packages?.name} - {item.amount} AZN</p>
                    {item.receipt_url && item.receipt_url !== 'SILINDI' && (
                      <a href={item.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline mt-1 inline-block">
                        📄 Ödəniş Qəbzinə Bax
                      </a>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveDeposit(item.id)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-sm"
                    >
                      Təsdiqlə
                    </button>
                    <button
                      onClick={() => handleRejectDeposit(item.id)}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm"
                    >
                      Ləğv Et
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. Çıxarış Sorğuları */}
        {activeTab === 'withdraws' && (
          <div className="space-y-4">
            {withdraws.length === 0 ? (
              <p className="text-gray-400">Gözləyən çıxarış sorğusu yoxdur.</p>
            ) : (
              withdraws.map((w) => (
                <div key={w.id} className="bg-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-700">
                  <div>
                    <p className="text-sm font-semibold text-amber-400">{w.profiles?.email}</p>
                    <p className="text-lg font-bold text-green-400">{w.amount} AZN</p>
                    <p className="text-xs text-gray-300 font-mono mt-1">Kart: {w.account_info}</p>
                  </div>
                  <button
                    onClick={() => handleApproveWithdraw(w)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-sm"
                  >
                    Ödənişi Göndərdim / Təsdiqlə
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Missiya Əlavə Et */}
        {activeTab === 'missions' && (
          <form onSubmit={handleCreateMission} className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-lg space-y-4">
            <h2 className="text-lg font-bold mb-2">Yeni Video Missiya</h2>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Başlıq</label>
              <input
                type="text"
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder="məs: YouTube videosunu izlə"
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Video Linki (YouTube və s.)</label>
              <input
                type="text"
                value={missionUrl}
                onChange={(e) => setMissionUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Mükafat Məbləği (AZN)</label>
              <input
                type="number"
                step="0.01"
                value={missionReward}
                onChange={(e) => setMissionReward(e.target.value)}
                placeholder="0.50"
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-lg"
            >
              Missiyanı Dərhal Dərc Et
            </button>
          </form>
        )}

        {/* 4. Tənzimləmələr */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-lg space-y-4">
            <h2 className="text-lg font-bold mb-2">Sistem və Rekvizit Tənzimləmələri</h2>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Kart Sahibi (Ad Soyad)</label>
              <input
                type="text"
                value={settings.card_holder}
                onChange={(e) => setSettings({ ...settings, card_holder: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Ödəniş Qəbul Edilən Kart Nömrəsi</label>
              <input
                type="text"
                value={settings.card_number}
                onChange={(e) => setSettings({ ...settings, card_number: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">Minimum Çıxarış Limit (AZN)</label>
              <input
                type="number"
                value={settings.min_withdraw}
                onChange={(e) => setSettings({ ...settings, min_withdraw: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-lg"
            >
              Yadda Saxla
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
